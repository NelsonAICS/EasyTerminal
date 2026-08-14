import type { WebLoadState } from '../features/webview/webview-controller';

export type WebLoadEvent =
  | { type: 'start'; url: string }
  | { type: 'ready'; url: string; title: string }
  | { type: 'error'; url: string; code: number; description: string; validatedURL?: string }
  | { type: 'crashed'; reason: string };

export function reduceWebLoadState(_state: WebLoadState, event: WebLoadEvent): WebLoadState {
  if (event.type === 'start') return { kind: 'loading', url: event.url };
  if (event.type === 'ready') return { kind: 'ready', url: event.url, title: event.title };
  if (event.type === 'error') return { kind: 'error', ...event };
  return { kind: 'crashed', reason: event.reason };
}
