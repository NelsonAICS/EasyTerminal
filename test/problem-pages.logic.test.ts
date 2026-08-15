import { describe, expect, it } from 'vitest';
import { applyDirectoryResult, beginDirectoryLoad, createFileTreeState } from '../src/lib/file-tree';
import { contrastRatio } from '../src/lib/color';
import { reduceWebLoadState } from '../src/lib/webview-state';
import { bindWebviewController, normalizeWebUrl, type WebviewLike } from '../src/features/webview/webview-controller';
import { DEFAULT_THEME_ID, THEME_PRESETS } from '../src/lib/themes';

describe('file tree response race protection', () => {
  it('loads a child directory without changing the visible tree root', () => {
    const root = createFileTreeState('/home/user');
    const childLoading = beginDirectoryLoad(root, '/home/user/projects', 'child-request');
    expect(childLoading.rootPath).toBe('/home/user');
    expect(childLoading.directories['/home/user/projects']?.loadState).toBe('loading');
  });

  it('ignores an older response for the same directory', () => {
    const root = createFileTreeState('/tmp');
    const loading = beginDirectoryLoad(beginDirectoryLoad(root, '/tmp', 'new'), '/tmp', 'latest');
    const stale = applyDirectoryResult(loading, { ok: true, requestId: 'new', path: '/tmp', entries: [] });
    expect(stale.directories['/tmp'].loadState).toBe('loading');
    const current = applyDirectoryResult(stale, { ok: true, requestId: 'latest', path: '/tmp', entries: [{ name: 'a', path: '/tmp/a', kind: 'file' }] });
    expect(current.directories['/tmp'].entries[0]?.name).toBe('a');
  });
});

describe('webview load state', () => {
  it('keeps errors diagnostic and allows a later ready state', () => {
    const error = reduceWebLoadState({ kind: 'booting' }, { type: 'error', url: 'http://localhost:3000/', code: -102, description: 'refused' });
    expect(error).toMatchObject({ kind: 'error', code: -102 });
    expect(reduceWebLoadState(error, { type: 'ready', url: 'http://localhost:3000/', title: 'Local' })).toMatchObject({ kind: 'ready', title: 'Local' });
  });

  it('registers diagnosable events and removes every listener on cleanup', () => {
    const listeners = new Map<string, Array<(event: unknown) => void>>();
    const webview: WebviewLike = {
      addEventListener: (type, listener) => listeners.set(type, [...(listeners.get(type) || []), listener]),
      removeEventListener: (type, listener) => listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener)),
      getURL: () => 'http://localhost:3000/',
      getTitle: () => 'Local preview',
      canGoBack: () => false,
      canGoForward: () => false,
      isLoading: () => true,
    };
    const states: string[] = [];
    const cleanup = bindWebviewController(webview, {
      onState: state => states.push(state.kind),
    });
    listeners.get('did-fail-load')?.forEach(listener => listener({ errorCode: -102, errorDescription: 'CONNECTION_REFUSED', isMainFrame: true }));
    expect(states).toEqual(['loading', 'error']);
    cleanup();
    expect(Array.from(listeners.values()).every(items => items.length === 0)).toBe(true);
  });

  it('falls back to ready when did-finish-load is missed but loading stops', () => {
    const listeners = new Map<string, Array<(event: unknown) => void>>();
    const webview: WebviewLike = {
      addEventListener: (type, listener) => listeners.set(type, [...(listeners.get(type) || []), listener]),
      removeEventListener: (type, listener) => listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener)),
      getURL: () => 'https://www.google.com/',
      getTitle: () => 'Google',
      canGoBack: () => false,
      canGoForward: () => false,
      isLoading: () => true,
    };
    const states: string[] = [];
    bindWebviewController(webview, { onState: state => states.push(state.kind) });

    listeners.get('did-stop-loading')?.forEach(listener => listener({}));

    expect(states).toEqual(['loading', 'ready']);
  });

  it('uses dom-ready as the final fallback when loading events are incomplete', () => {
    const listeners = new Map<string, Array<(event: unknown) => void>>();
    const webview: WebviewLike = {
      addEventListener: (type, listener) => listeners.set(type, [...(listeners.get(type) || []), listener]),
      removeEventListener: (type, listener) => listeners.set(type, (listeners.get(type) || []).filter(item => item !== listener)),
      getURL: () => 'https://www.google.com/',
      getTitle: () => 'Google',
      canGoBack: () => false,
      canGoForward: () => false,
      isLoading: () => true,
    };
    const states: string[] = [];
    bindWebviewController(webview, { onState: state => states.push(state.kind) });

    listeners.get('dom-ready')?.forEach(listener => listener({}));

    expect(states).toEqual(['loading', 'ready']);
  });

  it('normalizes only http and https URLs', () => {
    expect(normalizeWebUrl('localhost:3000', 'http:')).toBe('http://localhost:3000/');
    expect(() => normalizeWebUrl('file:///tmp/index.html')).toThrow('只允许打开 http 或 https');
  });
});

describe('theme terminal contrast', () => {
  it('uses the liquid glass theme as the default preset', () => {
    expect(DEFAULT_THEME_ID).toBe('liquid-glass');
    expect(THEME_PRESETS[0]?.id).toBe(DEFAULT_THEME_ID);
  });

  it('keeps every terminal foreground at WCAG AA contrast against its background', () => {
    for (const preset of THEME_PRESETS) {
      expect(contrastRatio(preset.terminal.foreground, preset.terminal.background), preset.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});
