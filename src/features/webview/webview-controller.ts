export type WebLoadState =
  | { kind: 'booting' }
  | { kind: 'loading'; url: string }
  | { kind: 'ready'; url: string; title: string }
  | { kind: 'error'; url: string; code: number; description: string; validatedURL?: string }
  | { kind: 'crashed'; reason: string };

export interface WebviewLike {
  addEventListener: (type: string, listener: (event: unknown) => void) => void;
  removeEventListener: (type: string, listener: (event: unknown) => void) => void;
  getURL: () => string;
  getTitle: () => string;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  isLoading?: () => boolean;
}

export interface WebviewMessage {
  channel: string;
  args: unknown[];
}

export interface WebviewControllerHandlers {
  onState: (state: WebLoadState) => void;
  onNavigation?: (url: string, canGoBack: boolean, canGoForward: boolean) => void;
  onTitle?: (title: string) => void;
  onMessage?: (message: WebviewMessage) => void;
  onDomReady?: () => void;
}

export function normalizeWebUrl(input: string, defaultProtocol = 'https:'): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('请输入网址。');
  const hasExplicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) || /^(?:file|javascript|data|mailto):/i.test(trimmed);
  const withProtocol = hasExplicitScheme ? trimmed : `${defaultProtocol}//${trimmed.replace(/^\/\//, '')}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('只允许打开 http 或 https 地址。');
  }
  return parsed.toString();
}

export function describeWebError(code: number, description: string): string {
  if (code === -102 || /connection refused/i.test(description)) return '该地址没有服务监听，请启动服务或修改端口。';
  if (code === -105 || /name not resolved|dns/i.test(description)) return '域名解析失败，请检查地址或网络连接。';
  if (code === -107 || /certificate|cert/i.test(description)) return '证书校验失败，连接未建立。';
  if (code === -3) return '加载被取消。';
  return description || '网页加载失败。';
}

function readFailEvent(event: unknown) {
  const value = (event || {}) as { errorCode?: unknown; errorDescription?: unknown; validatedURL?: unknown; isMainFrame?: unknown };
  return {
    code: typeof value.errorCode === 'number' ? value.errorCode : -1,
    description: typeof value.errorDescription === 'string' ? value.errorDescription : '',
    validatedURL: typeof value.validatedURL === 'string' ? value.validatedURL : undefined,
    isMainFrame: value.isMainFrame !== false,
  };
}

export function bindWebviewController(webview: WebviewLike, handlers: WebviewControllerHandlers): () => void {
  const getUrl = () => {
    try { return webview.getURL() || ''; } catch { return ''; }
  };
  const getTitle = () => {
    try { return webview.getTitle() || ''; } catch { return ''; }
  };
  const syncNavigation = () => {
    let canGoBack = false;
    let canGoForward = false;
    try {
      canGoBack = webview.canGoBack();
      canGoForward = webview.canGoForward();
    } catch {
      // The guest may be tearing down; leave navigation disabled.
    }
    handlers.onNavigation?.(getUrl(), canGoBack, canGoForward);
  };

  const onStartLoading = () => handlers.onState({ kind: 'loading', url: getUrl() });
  const onStopLoading = () => syncNavigation();
  const onFinishLoad = () => {
    const url = getUrl();
    handlers.onState({ kind: 'ready', url, title: getTitle() });
    handlers.onTitle?.(getTitle());
    syncNavigation();
  };
  const onFailLoad = (event: unknown) => {
    const failure = readFailEvent(event);
    if (!failure.isMainFrame || failure.code === -3) return;
    handlers.onState({
      kind: 'error',
      url: getUrl(),
      code: failure.code,
      description: describeWebError(failure.code, failure.description),
      ...(failure.validatedURL ? { validatedURL: failure.validatedURL } : {}),
    });
    syncNavigation();
  };
  const onNavigate = () => syncNavigation();
  const onNavigateInPage = () => syncNavigation();
  const onTitleUpdated = () => handlers.onTitle?.(getTitle());
  const onRenderProcessGone = (event: unknown) => {
    const value = (event || {}) as { reason?: unknown };
    handlers.onState({ kind: 'crashed', reason: typeof value.reason === 'string' ? value.reason : '网页进程意外退出。' });
  };
  const onIpcMessage = (event: unknown) => {
    const value = (event || {}) as { channel?: unknown; args?: unknown[] };
    if (typeof value.channel === 'string') handlers.onMessage?.({ channel: value.channel, args: value.args || [] });
  };
  const onDomReady = () => handlers.onDomReady?.();

  const listeners: Array<[string, (event: unknown) => void]> = [
    ['did-start-loading', onStartLoading],
    ['did-stop-loading', onStopLoading],
    ['did-finish-load', onFinishLoad],
    ['did-fail-load', onFailLoad],
    ['did-navigate', onNavigate],
    ['did-navigate-in-page', onNavigateInPage],
    ['page-title-updated', onTitleUpdated],
    ['render-process-gone', onRenderProcessGone],
    ['ipc-message', onIpcMessage],
    ['dom-ready', onDomReady],
  ];
  listeners.forEach(([type, listener]) => webview.addEventListener(type, listener));
  const initialUrl = getUrl();
  if (initialUrl) {
    let initialLoading = true;
    try { initialLoading = webview.isLoading ? webview.isLoading() : true; } catch { /* guest may still be attaching */ }
    if (initialLoading) {
      handlers.onState({ kind: 'loading', url: initialUrl });
    } else {
      handlers.onState({ kind: 'ready', url: initialUrl, title: getTitle() });
      handlers.onTitle?.(getTitle());
      syncNavigation();
    }
  }
  return () => listeners.forEach(([type, listener]) => webview.removeEventListener(type, listener));
}
