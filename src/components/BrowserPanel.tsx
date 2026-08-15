// BrowserPanel — Built-in web browser for AI Web interaction
// Features: navigation, URL bar, back/forward/refresh, browser ↔ terminal interaction
// 4.3.x: Plugin/script extensibility with URL pattern matching

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, RefreshCw, Globe, ExternalLink,
  Loader2, Check, Puzzle, Plus, Trash2, X, Edit2,
  ToggleLeft, ToggleRight, BookOpen
} from 'lucide-react';
import { bindWebviewController, normalizeWebUrl, type WebLoadState } from '../features/webview/webview-controller';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const DEFAULT_URL = 'https://www.google.com';

interface BrowserPlugin {
  id: string;
  name: string;
  description: string;
  match_pattern: string;
  script: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export function BrowserPanel({ onSendToTerminal }: { onSendToTerminal?: (value: string) => void }) {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [title, setTitle] = useState('');
  const [loadState, setLoadState] = useState<WebLoadState>({ kind: 'booting' });
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [preloadPath, setPreloadPath] = useState<string>('');
  const [documentReady, setDocumentReady] = useState(false);
  const contextSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);
  // A page can remain busy with background resources after its document is
  // already interactive. Only show loading chrome before the document is ready.
  const loading = loadState.kind === 'booting' || (loadState.kind === 'loading' && !documentReady);

  // ── Plugin State ─────────────────────────────────────────────────
  const [plugins, setPlugins] = useState<BrowserPlugin[]>([]);
  const [showPluginModal, setShowPluginModal] = useState(false);
  const [showPluginEditor, setShowPluginEditor] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<BrowserPlugin | null>(null);
  const [pluginName, setPluginName] = useState('');
  const [pluginDesc, setPluginDesc] = useState('');
  const [pluginPattern, setPluginPattern] = useState('*://*/*');
  const [pluginScript, setPluginScript] = useState('');

  // ── Plugin Data Loading ──────────────────────────────────────────
  const loadPlugins = useCallback(async () => {
    if (!ipcRenderer) return;
    try {
      const list = await ipcRenderer.invoke('browser:plugin:list');
      setPlugins(list as BrowserPlugin[]);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadPlugins());
  }, [loadPlugins]);

  // ── Plugin CRUD ──────────────────────────────────────────────────
  const openPluginEditor = useCallback((plugin?: BrowserPlugin) => {
    if (plugin) {
      setEditingPlugin(plugin);
      setPluginName(plugin.name);
      setPluginDesc(plugin.description);
      setPluginPattern(plugin.match_pattern);
      setPluginScript(plugin.script);
    } else {
      setEditingPlugin(null);
      setPluginName('');
      setPluginDesc('');
      setPluginPattern('*://*/*');
      setPluginScript('// Your custom script here\nconsole.log("Hello from EasyTerminal plugin!");');
    }
    setShowPluginEditor(true);
  }, []);

  const closePluginEditor = useCallback(() => {
    setShowPluginEditor(false);
    setEditingPlugin(null);
  }, []);

  const savePlugin = useCallback(async () => {
    if (!ipcRenderer || !pluginName.trim() || !pluginScript.trim()) return;
    try {
      if (editingPlugin) {
        await ipcRenderer.invoke('browser:plugin:update', editingPlugin.id, {
          name: pluginName.trim(),
          description: pluginDesc.trim(),
          matchPattern: pluginPattern.trim(),
          script: pluginScript,
        });
      } else {
        await ipcRenderer.invoke('browser:plugin:create', {
          name: pluginName.trim(),
          description: pluginDesc.trim(),
          matchPattern: pluginPattern.trim(),
          script: pluginScript,
          enabled: true,
        });
      }
      await loadPlugins();
      closePluginEditor();
    } catch {
      // Ignore
    }
  }, [editingPlugin, pluginName, pluginDesc, pluginPattern, pluginScript, loadPlugins, closePluginEditor]);

  const togglePlugin = useCallback(async (plugin: BrowserPlugin) => {
    if (!ipcRenderer) return;
    try {
      await ipcRenderer.invoke('browser:plugin:update', plugin.id, {
        enabled: plugin.enabled === 1 ? false : true,
      });
      await loadPlugins();
    } catch {
      // Ignore
    }
  }, [loadPlugins]);

  const deletePlugin = useCallback(async (id: string) => {
    if (!ipcRenderer) return;
    try {
      await ipcRenderer.invoke('browser:plugin:delete', id);
      await loadPlugins();
    } catch {
      // Ignore
    }
  }, [loadPlugins]);

  // ── Load Preload Path ─────────────────────────────────────────────
  useEffect(() => {
    if (!ipcRenderer) return;
    ipcRenderer.invoke('get-webview-preload-path').then((p: string) => {
      setPreloadPath(p.startsWith('file://') ? p : `file://${p}`);
    }).catch(() => {
      // Fallback: use relative path that works in dev
      setPreloadPath('./webview-preload.js');
    });
  }, []);

  // ── Navigation Callbacks ─────────────────────────────────────────
  const syncInputUrl = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setInputUrl(newUrl);
  }, []);

  const handleNavigate = useCallback(async (targetUrl: string) => {
    if (!webviewRef.current) return;
    try {
      const finalUrl = normalizeWebUrl(targetUrl);
      setInputUrl(finalUrl);
      setUrl(finalUrl);
      setDocumentReady(false);
      setLoadState({ kind: 'loading', url: finalUrl });
      await webviewRef.current.loadURL(finalUrl);
    } catch (error) {
      setDocumentReady(false);
      const message = error instanceof Error ? error.message : '无法加载地址。';
      setLoadState({ kind: 'error', url: targetUrl, code: -1, description: message });
    }
  }, []);

  const handleBack = useCallback(() => {
    if (webviewRef.current?.canGoBack()) {
      setDocumentReady(false);
      webviewRef.current.goBack();
    }
  }, []);

  const handleForward = useCallback(() => {
    if (webviewRef.current?.canGoForward()) {
      setDocumentReady(false);
      webviewRef.current.goForward();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (webviewRef.current) {
      setDocumentReady(false);
      webviewRef.current.reload();
    }
  }, []);

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate(inputUrl);
    }
  };

  // ── WebView Event Registration ───────────────────────────────────
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    return bindWebviewController(wv, {
      onState: nextState => {
        setLoadState(nextState);
        if (nextState.kind === 'error' || nextState.kind === 'crashed') setDocumentReady(false);
        if (nextState.kind === 'ready') setDocumentReady(true);
        if (nextState.kind === 'ready') {
          syncInputUrl(nextState.url);
          setTitle(nextState.title);
          if (ipcRenderer && nextState.url) {
            ipcRenderer.invoke('browser:save-history', { url: nextState.url, title: nextState.title }).catch(() => undefined);
          }
        }
      },
      onNavigation: (nextUrl, nextCanGoBack, nextCanGoForward) => {
        if (nextUrl) syncInputUrl(nextUrl);
        setCanGoBack(nextCanGoBack);
        setCanGoForward(nextCanGoForward);
      },
      onTitle: nextTitle => setTitle(nextTitle),
      onDomReady: () => setDocumentReady(true),
      onMessage: message => {
        if (message.channel === 'browser-selection') {
          const value = message.args[0] as { text?: unknown } | undefined;
          if (typeof value?.text === 'string' && value.text.trim()) setSelectedText(value.text.trim());
        }
      },
    });
  }, [syncInputUrl]);

  const showFeedback = (message: string) => {
    setContextSaved(true);
    if (contextSavedTimerRef.current) clearTimeout(contextSavedTimerRef.current);
    contextSavedTimerRef.current = setTimeout(() => setContextSaved(false), 2400);
    setTitle(message);
  };

  const saveSelectedContext = async () => {
    if (!ipcRenderer || !selectedText) return;
    try {
      const result = await ipcRenderer.invoke('context:save-snippet', selectedText, 'browser-selection');
      if (!result) throw new Error('保存接口未返回成功结果。');
      showFeedback('已保存选中文本');
    } catch {
      showFeedback('保存失败，请重试');
    }
  };

  const sendSelectedToTerminal = async () => {
    if (!selectedText) return;
    try {
      if (onSendToTerminal) onSendToTerminal(selectedText);
      else await ipcRenderer?.invoke('browser:send-to-terminal', selectedText);
      showFeedback('已发送到终端输入');
    } catch {
      showFeedback('发送失败，请重试');
    }
  };

  // ── Cleanup Timer ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (contextSavedTimerRef.current) {
        clearTimeout(contextSavedTimerRef.current);
      }
    };
  }, []);

  // ── Match Pattern Examples ────────────────────────────────────────
  const patternExamples = [
    { label: '所有网站', pattern: '*://*/*' },
    { label: '所有 HTTPS', pattern: 'https://*/*' },
    { label: 'Google', pattern: '*://*.google.com/*' },
    { label: 'GitHub', pattern: '*://github.com/*' },
    { label: '百度', pattern: '*://*.baidu.com/*' },
  ];

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[var(--panel-bg)]">
      {/* Navigation Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--panel-border)] bg-[var(--surface-muted)]">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="后退"
          >
            <ArrowLeft size={15} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="前进"
          >
            <ArrowRight size={15} />
          </button>
          <button
            onClick={handleRefresh}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="刷新"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 relative">
          <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="输入网址..."
            className="w-full pl-8 pr-8 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--panel-border)] text-[var(--text-primary)] text-xs focus:border-[var(--accent)]/50 focus:outline-none placeholder:text-[var(--text-secondary)]"
          />
          {loading && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent)] animate-spin" />
          )}
        </div>

        {/* Plugin Button */}
        <button
          onClick={() => { setShowPluginModal(true); loadPlugins(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] relative"
          title="插件管理"
        >
          <Puzzle size={15} />
          {plugins.filter(p => p.enabled === 1).length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--accent)] text-[9px] text-white font-medium flex items-center justify-center">
              {plugins.filter(p => p.enabled === 1).length}
            </span>
          )}
        </button>

        {/* External Link */}
        <button
          onClick={() => { if (url) void ipcRenderer?.invoke('webview:open-external', url); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="在新窗口中打开"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Progress Bar: the webview does not expose a reliable byte progress source. */}
      {loading && (
        <div className="h-0.5 bg-[var(--panel-border)]">
          <div className="h-full w-1/3 animate-pulse bg-[var(--accent)]" />
        </div>
      )}

      {/* WebView — only render once preloadPath is resolved */}
      <div className="flex-1 relative min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
        {preloadPath ? (
          <webview
            ref={webviewRef}
            src={DEFAULT_URL}
            style={{ display: 'flex', flex: 1, width: '100%', height: '100%', minHeight: 0 }}
            partition="persist:easyterminal-browser"
            preload={preloadPath}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="text-[var(--text-secondary)] animate-spin" />
          </div>
        )}

        {loadState.kind === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--panel-bg)] p-6">
            <div className="w-full max-w-lg rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm text-[var(--text-primary)]">
              <div className="font-medium">网页无法加载</div>
              <div className="mt-2 break-all text-xs text-[var(--text-secondary)]">地址：{loadState.validatedURL || loadState.url}</div>
              <div className="mt-1 text-xs text-red-700 dark:text-red-200">错误码：{loadState.code} · {loadState.description}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void handleNavigate(inputUrl)} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs text-white">重试</button>
                <button type="button" onClick={() => void ipcRenderer?.invoke('webview:open-external', loadState.validatedURL || loadState.url)} className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-primary)]">在系统浏览器打开</button>
              </div>
            </div>
          </div>
        )}

        {loadState.kind === 'crashed' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--panel-bg)] p-6">
            <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm text-[var(--text-primary)]">
              <div className="font-medium">网页进程已崩溃</div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">原因：{loadState.reason}</div>
              <button type="button" onClick={() => void handleNavigate(url)} className="mt-4 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs text-white">重新加载</button>
            </div>
          </div>
        )}

        {/* Context Saved Feedback */}
        {contextSaved && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/90 text-white text-[11px] shadow-lg animate-pulse">
            <Check size={12} />
            已保存到上下文
          </div>
        )}

        {selectedText && !contextSaved && (
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-3 py-2 shadow-lg">
            <span className="min-w-0 truncate text-[11px] text-[var(--text-secondary)]">已选中文本：{selectedText}</span>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => void saveSelectedContext()} className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-200">保存上下文</button>
              <button type="button" onClick={() => void sendSelectedToTerminal()} className="rounded-lg bg-blue-500/15 px-2.5 py-1.5 text-[11px] text-blue-800 dark:text-blue-200">发送终端</button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--panel-border)] bg-[var(--surface-muted)] text-[10px] text-[var(--text-secondary)]">
        <span className="truncate max-w-[60%]">{url}</span>
        <div className="flex items-center gap-3 shrink-0">
          {canGoBack && <span className="text-cyan-400/60">← 可后退</span>}
          {canGoForward && <span className="text-cyan-400/60">可前进 →</span>}
          {title && <span className="truncate max-w-[200px] opacity-60">{title}</span>}
          {plugins.filter(p => p.enabled === 1).length > 0 && (
            <span className="text-purple-400/60 flex items-center gap-1">
              <Puzzle size={10} />
              {plugins.filter(p => p.enabled === 1).length} 插件
            </span>
          )}
          <span className="text-[var(--accent)] opacity-60">WebView</span>
        </div>
      </div>

      {/* ── Plugin Manager Modal ───────────────────────────────── */}
      {showPluginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[680px] max-h-[85vh] rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--panel-border)]">
              <div className="flex items-center gap-2">
                <Puzzle size={18} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">浏览器插件管理</h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-medium">
                  {plugins.length} 个插件
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPluginEditor()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white text-[11px] font-medium transition-colors"
                >
                  <Plus size={13} />
                  添加插件
                </button>
                <button
                  onClick={() => { setShowPluginModal(false); setShowPluginEditor(false); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--panel-border)] text-[var(--text-secondary)] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              {showPluginEditor ? (
                // ── Plugin Editor ─────────────────────────────────
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={closePluginEditor}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      ← 返回列表
                    </button>
                    <span className="text-[var(--text-secondary)] text-[11px]">/</span>
                    <span className="text-[11px] text-[var(--accent)]">
                      {editingPlugin ? '编辑插件' : '新建插件'}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                      插件名称 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pluginName}
                      onChange={e => setPluginName(e.target.value)}
                      placeholder="例如: 自动展开 GitHub 折叠内容"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--panel-border)] text-[var(--text-primary)] text-xs focus:border-[var(--accent)]/50 focus:outline-none placeholder:text-[var(--text-secondary)]"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                      描述
                    </label>
                    <input
                      type="text"
                      value={pluginDesc}
                      onChange={e => setPluginDesc(e.target.value)}
                      placeholder="简要描述插件的功能..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--panel-border)] text-[var(--text-primary)] text-xs focus:border-[var(--accent)]/50 focus:outline-none placeholder:text-[var(--text-secondary)]"
                    />
                  </div>

                  {/* Match Pattern */}
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                      URL 匹配规则 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pluginPattern}
                      onChange={e => setPluginPattern(e.target.value)}
                      placeholder="*://*/*"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--panel-border)] text-[var(--text-primary)] text-xs focus:border-[var(--accent)]/50 focus:outline-none font-mono placeholder:text-[var(--text-secondary)]"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {patternExamples.map(ex => (
                        <button
                          key={ex.pattern}
                          onClick={() => setPluginPattern(ex.pattern)}
                          className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                            pluginPattern === ex.pattern
                              ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                              : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {ex.label}: {ex.pattern}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Script */}
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                      脚本内容 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={pluginScript}
                      onChange={e => setPluginScript(e.target.value)}
                      rows={12}
                      placeholder={`// 在匹配的页面中注入自定义 JavaScript\n// 例如:\ndocument.querySelectorAll('.collapsed').forEach(el => el.classList.remove('collapsed'));\n\n// 或者拦截请求:\n// fetch = new Proxy(fetch, { ... });`}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--panel-border)] text-[var(--text-primary)] text-[11px] focus:border-[var(--accent)]/50 focus:outline-none font-mono placeholder:text-[var(--text-secondary)] resize-y"
                    />
                    <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                      脚本仅保存为配置，当前版本默认不会注入或执行任意用户脚本。
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={closePluginEditor}
                      className="px-4 py-2 rounded-lg text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={savePlugin}
                      disabled={!pluginName.trim() || !pluginScript.trim()}
                      className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {editingPlugin ? '保存修改' : '创建插件'}
                    </button>
                  </div>
                </div>
              ) : (
                // ── Plugin List ────────────────────────────────────
                <div className="p-4">
                  {plugins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Puzzle size={32} className="text-[var(--text-secondary)] opacity-40" />
                      <div className="text-center">
                        <p className="text-[13px] text-[var(--text-secondary)]">暂无插件</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1 opacity-60">
                          保存网站规则与脚本配置；当前版本默认不会自动执行
                        </p>
                      </div>
                      <button
                        onClick={() => openPluginEditor()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white text-[11px] font-medium transition-colors mt-1"
                      >
                        <Plus size={13} />
                        添加第一个插件
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {plugins.map(plugin => (
                        <div
                          key={plugin.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            plugin.enabled === 1
                              ? 'border-purple-500/30 bg-purple-500/5'
                              : 'border-[var(--panel-border)] bg-[var(--surface-muted)]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                                  {plugin.name}
                                </span>
                                {plugin.enabled === 1 && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300">
                                    已启用
                                  </span>
                                )}
                              </div>
                              {plugin.description && (
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                                  {plugin.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[var(--text-secondary)] font-mono opacity-60">
                                  {plugin.match_pattern}
                                </span>
                                <span className="text-[10px] text-[var(--text-secondary)] opacity-40">
                                  {plugin.script.split('\n').length} 行
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => togglePlugin(plugin)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                title={plugin.enabled === 1 ? '禁用' : '启用'}
                              >
                                {plugin.enabled === 1 ? (
                                  <ToggleRight size={18} className="text-green-400" />
                                ) : (
                                  <ToggleLeft size={18} className="text-[var(--text-secondary)]" />
                                )}
                              </button>
                              <button
                                onClick={() => openPluginEditor(plugin)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                title="编辑"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => deletePlugin(plugin.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                                title="删除"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!showPluginEditor && plugins.length > 0 && (
              <div className="px-5 py-3 border-t border-[var(--panel-border)] bg-[var(--surface-muted)]/30">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                  <BookOpen size={11} className="opacity-60" />
                  <span>
                    用户脚本注入默认关闭；启用前需要单独的站点权限与脚本审阅能力。
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
