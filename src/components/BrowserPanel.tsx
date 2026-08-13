// BrowserPanel — Built-in web browser for AI Web interaction
// Features: navigation, URL bar, back/forward/refresh, browser ↔ terminal interaction
// 4.3.x: Plugin/script extensibility with URL pattern matching

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, RefreshCw, Globe, ExternalLink,
  Loader2, Check, Puzzle, Plus, Trash2, X, Edit2,
  ToggleLeft, ToggleRight, BookOpen
} from 'lucide-react';

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

// ── URL Pattern Matching ──────────────────────────────────────────
function matchesPattern(url: string, pattern: string): boolean {
  try {
    // Simple wildcard matching: *://*.host.com/path/*
    // Supports: * for any chars, ? for single char
    const parts = pattern.match(/^(\*|https?|wss?):\/\/(\*|\*\.)?([^\/]+)(\/.*)?$/i);
    if (!parts) return url.includes(pattern.replace(/\*/g, ''));

    const [, scheme, wildcardSub, host, path] = parts;
    const urlParts = url.match(/^(https?|wss?):\/\/([^\/]+)(\/.*)?$/i);
    if (!urlParts) return false;

    const [, urlScheme, urlHost, urlPath] = urlParts;

    // Check scheme
    if (scheme !== '*' && urlScheme.toLowerCase() !== scheme.toLowerCase()) return false;

    // Check host (supports *.example.com)
    if (wildcardSub === '*.' || wildcardSub === '*') {
      if (wildcardSub === '*.' && !urlHost.endsWith(host.replace(/\*\.?/g, ''))) return false;
      if (wildcardSub === '*' && urlHost !== host.replace(/\*/g, '')) return false;
    } else {
      if (urlHost.toLowerCase() !== host.toLowerCase()) return false;
    }

    // Check path
    if (path && path !== '/*') {
      const pathRegex = path.replace(/\*/g, '.*').replace(/\?/g, '.');
      if (!new RegExp(`^${pathRegex}$`, 'i').test(urlPath || '/')) return false;
    }

    return true;
  } catch {
    return url.includes(pattern.replace(/\*/g, ''));
  }
}

export function BrowserPanel() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [webviewReady, setWebviewReady] = useState(false);
  const [preloadPath, setPreloadPath] = useState<string>('');
  const contextSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);

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
    loadPlugins();
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
      setPreloadPath(p);
    }).catch(() => {
      // Fallback: use relative path that works in dev
      setPreloadPath('./webview-preload.js');
    });
  }, []);

  const injectPlugins = useCallback((currentUrl: string) => {
    if (!webviewRef.current) return;
    const matchingPlugins = plugins.filter(p => p.enabled === 1 && matchesPattern(currentUrl, p.match_pattern));
    if (matchingPlugins.length > 0) {
      const scripts = matchingPlugins.map(p => p.script);
      webviewRef.current.send('inject-plugins', scripts);
    }
  }, [plugins]);

  // ── Navigation Callbacks ─────────────────────────────────────────
  const syncInputUrl = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setInputUrl(newUrl);
  }, []);

  const handleNavigate = useCallback((targetUrl: string) => {
    if (!webviewReady || !webviewRef.current) return;
    let finalUrl = targetUrl.trim();
    if (!finalUrl) return;

    if (!finalUrl.match(/^https?:\/\//i)) {
      finalUrl = 'https://' + finalUrl;
    }

    webviewRef.current.loadURL(finalUrl);
  }, [webviewReady]);

  const handleBack = useCallback(() => {
    if (webviewReady && webviewRef.current?.canGoBack()) {
      webviewRef.current.goBack();
    }
  }, [webviewReady]);

  const handleForward = useCallback(() => {
    if (webviewReady && webviewRef.current?.canGoForward()) {
      webviewRef.current.goForward();
    }
  }, [webviewReady]);

  const handleRefresh = useCallback(() => {
    if (webviewReady && webviewRef.current) {
      webviewRef.current.reload();
    }
  }, [webviewReady]);

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate(inputUrl);
    }
  };

  // ── WebView Event Registration ───────────────────────────────────
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onAttach = () => {
      setWebviewReady(true);
      if (!hasLoaded) {
        wv.loadURL(DEFAULT_URL);
        setHasLoaded(true);
      }
      // Inject script for text selection — must run after WebView is attached
      const selectionScript = `
        document.addEventListener('mouseup', function() {
          var selection = window.getSelection();
          var text = selection ? selection.toString().trim() : '';
          if (text && text.length > 0 && text.length < 5000) {
            var webview = document.querySelector('webview');
            if (webview) {
              webview.send('browser:selection', { text: text, url: window.location.href });
            }
          }
        });
      `;
      try {
        wv.executeJavaScript(selectionScript);
      } catch {
        // Script injection may fail on some pages
      }
    };

    const onLoad = () => {
      setLoading(false);
      setLoadProgress(0);
      if (wv) {
        const currentUrl = wv.getURL();
        syncInputUrl(currentUrl);
        setTitle(wv.getTitle());
        setCanGoBack(wv.canGoBack());
        setCanGoForward(wv.canGoForward());
        // Inject matching plugins
        injectPlugins(currentUrl);
        // Save this page to context automatically
        if (ipcRenderer) {
          const pageUrl = wv.getURL();
          const pageTitle = wv.getTitle();
          ipcRenderer.invoke('context:save-snippet', `访问页面: ${pageTitle}\nURL: ${pageUrl}`, 'browser-navigation').catch(() => {});
          ipcRenderer.invoke('browser:save-history', { url: pageUrl, title: pageTitle }).catch(() => {});
        }
      }
    };

    const onStartLoad = () => {
      setLoading(true);
    };

    const onTitleChange = () => {
      if (wv) {
        setTitle(wv.getTitle());
      }
    };

    wv.addEventListener('did-attach', onAttach);
    wv.addEventListener('did-finish-load', onLoad);
    wv.addEventListener('did-start-loading', onStartLoad);
    wv.addEventListener('page-title-updated', onTitleChange);

    return () => {
      wv.removeEventListener('did-attach', onAttach);
      wv.removeEventListener('did-finish-load', onLoad);
      wv.removeEventListener('did-start-loading', onStartLoad);
      wv.removeEventListener('page-title-updated', onTitleChange);
    };
  }, [hasLoaded, syncInputUrl, injectPlugins]);

  // ── Text Selection Handler ──────────────────────────────────────
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleSelection = (_event: unknown, data: { text: string; url: string }) => {
      if (data.text && data.text.trim()) {
        ipcRenderer.invoke('context:save-snippet', data.text, 'browser-selection').catch(() => {});
        ipcRenderer.invoke('browser:send-to-terminal', data.text).catch(() => {});
        setContextSaved(true);
        if (contextSavedTimerRef.current) {
          clearTimeout(contextSavedTimerRef.current);
        }
        contextSavedTimerRef.current = setTimeout(() => {
          setContextSaved(false);
        }, 2000);
      }
    };

    ipcRenderer.on('browser:selection', handleSelection as (...args: unknown[]) => void);
    return () => {
      ipcRenderer.removeListener('browser:selection', handleSelection as (...args: unknown[]) => void);
    };
  }, []);

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
          onClick={() => { if (url) window.open(url, '_blank'); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="在新窗口中打开"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Progress Bar */}
      {loading && (
        <div className="h-0.5 bg-[var(--panel-border)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-150"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      )}

      {/* WebView — only render once preloadPath is resolved */}
      <div className="flex-1 relative min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
        {preloadPath ? (
          <webview
            ref={webviewRef}
            style={{ display: 'flex', flex: 1, width: '100%', height: '100%', minHeight: 0 }}
            partition="persist:easyterminal-browser"
            preload={preloadPath}
            allowpopups
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="text-[var(--text-secondary)] animate-spin" />
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="text-[var(--accent)] animate-spin" />
              <span className="text-[11px] text-[var(--text-secondary)]">正在加载...</span>
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
                      脚本将在匹配的页面加载完成后自动执行。支持任意 JavaScript。
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
                          添加自定义脚本，在特定网站上自动执行
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
                    插件脚本在页面加载完成后自动注入到匹配的页面中执行。
                    支持油猴脚本 (Tampermonkey) 风格的 JavaScript。
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
