import { X, Sparkles, ScrollText, Loader2, Copy, CheckCheck, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown.css';
import { useState } from 'react';

import { UIModal } from './ui';
import type { UIIntent } from '../types/agent-extension';
import { TERMINAL_AGENT_COPY } from '../lib/ui-copy';

function isMarkdownContent(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const markdownIndicators = [
    'resultText', 'answer', 'output', 'content', 'summary',
    'rendered', 'optimized', 'body', 'description',
  ];
  if (!markdownIndicators.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
    return false;
  }
  // Check if it looks like markdown
  return value.includes('\n') || value.includes('**') || value.includes('```') ||
         value.includes('##') || value.includes('* ') || value.includes('- ');
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return TERMINAL_AGENT_COPY.emptyValue;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
      title="复制内容"
    >
      {copied ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

function ValueRenderer({ keyName, value }: { keyName: string; value: unknown }) {
  const text = renderValue(value);
  const asMarkdown = isMarkdownContent(keyName, value);

  if (asMarkdown) {
    return (
      <div className="relative">
        <div className="absolute right-2 top-2 z-10">
          <CopyButton text={text} />
        </div>
        <div className="markdown-body overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-black/15 p-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: ({ children }) => (
                <pre className="mt-2 overflow-x-auto rounded-xl border border-white/8 bg-black/40 p-4 text-sm">
                  {children}
                </pre>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="rounded-md border border-white/12 bg-black/30 px-1.5 py-0.5 font-mono text-xs text-cyan-300">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className}>
                    {children}
                  </code>
                );
              },
              p: ({ children }) => (
                <p className="mb-3 leading-7 last:mb-0">{children}</p>
              ),
              h1: ({ children }) => (
                <h1 className="mb-3 mt-5 text-xl font-bold text-white first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 mt-4 text-lg font-semibold text-white/90 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-3 text-base font-medium text-white/80 first:mt-0">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 list-inside list-disc space-y-1 leading-7">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 list-inside list-decimal space-y-1 leading-7">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-7 text-[var(--text-primary)]">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-3 border-l-3 border-sky-400/40 bg-sky-500/5 pl-4 italic text-white/60">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="bg-white/5 px-3 py-2 text-left font-medium text-white/80">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-white/70">{children}</td>
              ),
              a: ({ children, href }) => (
                <a href={href} className="text-sky-400 underline underline-offset-2 hover:text-sky-300" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-white/80">{children}</em>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10">
        <CopyButton text={text} />
      </div>
      <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/72 whitespace-pre-wrap break-words font-mono">
        {text}
      </pre>
    </div>
  );
}

export function UIIntentRenderer({
  intent,
  onClose,
  onAction,
  isStreaming = false,
}: {
  intent: UIIntent | null;
  onClose: () => void;
  onAction?: (actionId: string) => void;
  isStreaming?: boolean;
}) {
  if (!intent) return null;

  const isSnapshot = intent.type === 'show_context_snapshot';
  const title = intent.title || (isSnapshot ? TERMINAL_AGENT_COPY.snapshotTitle : TERMINAL_AGENT_COPY.resultPanelTitle);
  const description = intent.description || (isSnapshot
    ? TERMINAL_AGENT_COPY.snapshotDescription
    : TERMINAL_AGENT_COPY.resultPanelDescription);

  const payloadEntries = Object.entries(intent.payload || {});

  // Detect if payload has a primary result field to display prominently
  const primaryResultKey = payloadEntries.find(([k]) =>
    ['resultText', 'answer', 'output', 'content', 'rendered', 'optimized', 'body'].some(
      pk => k.toLowerCase().includes(pk.toLowerCase())
    )
  );
  const primaryKey = primaryResultKey?.[0];
  const primaryValue = primaryResultKey?.[1];
  const secondaryEntries = primaryKey
    ? payloadEntries.filter(([k]) => k !== primaryKey)
    : payloadEntries;

  return (
    <UIModal open={!!intent} className="h-[86vh] max-w-[1120px] bg-[linear-gradient(180deg,rgba(9,14,25,0.98),rgba(6,10,20,0.99))]">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--panel-border)] px-7 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              {isStreaming && <Loader2 size={14} className="animate-spin text-sky-400" />}
              {!isStreaming && (isSnapshot ? <ScrollText size={14} className="text-cyan-300" /> : <Sparkles size={14} className="text-sky-300" />)}
              <span>{isStreaming ? '执行中' : isSnapshot ? TERMINAL_AGENT_COPY.intentBadgeSnapshot : TERMINAL_AGENT_COPY.intentBadgeResult}</span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--panel-border)] bg-white/5 p-2 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-5">
          <div className="grid h-full gap-5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_18rem]">
            {/* Primary content area */}
            <div className="min-h-0 overflow-y-auto">
              {isStreaming ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/72 p-8 text-center">
                  <Loader2 size={32} className="animate-spin text-sky-400" />
                  <p className="text-sm text-[var(--text-secondary)]">正在处理，请稍候...</p>
                </div>
              ) : primaryKey && primaryValue !== undefined ? (
                <ValueRenderer keyName={primaryKey} value={primaryValue} />
              ) : payloadEntries.length > 0 ? (
                <div className="space-y-4">
                  {payloadEntries.map(([key, value]) => (
                    <div key={key} className="rounded-[1.25rem] border border-white/8 bg-black/15 p-4">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{key}</div>
                      <ValueRenderer keyName={key} value={value} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center text-sm text-[var(--text-secondary)]">
                  {TERMINAL_AGENT_COPY.intentEmptyPayload}
                </div>
              )}

              {/* Secondary metadata entries */}
              {!isStreaming && secondaryEntries.length > 0 && primaryKey && (
                <div className="mt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">其他信息</div>
                  {secondaryEntries.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/6 bg-black/10 p-3">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-white/35">{key}</div>
                      <pre className="overflow-x-auto text-xs leading-5 text-white/60 whitespace-pre-wrap break-words font-mono">
                        {renderValue(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 overflow-y-auto">
              <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/72 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{TERMINAL_AGENT_COPY.intentMetaTitle}</div>
                <div className="mt-3 space-y-2 text-sm text-[var(--text-primary)]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                      {isStreaming && <Loader2 size={10} className="animate-spin" />}
                      {intent.type}
                    </span>
                  </div>
                  <div className="truncate text-xs text-white/40" title={intent.id}>ID: {intent.id.slice(0, 20)}...</div>
                  {intent.createdAt && <div className="text-xs text-white/40">{new Date(intent.createdAt).toLocaleString()}</div>}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/72 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{TERMINAL_AGENT_COPY.intentNextStepTitle}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {(intent.actions || []).map(action => (
                    <button
                      key={action.id}
                      onClick={() => onAction?.(action.id)}
                      disabled={isStreaming}
                      className={`rounded-2xl px-4 py-2.5 text-sm text-left transition-all ${
                        isStreaming
                          ? 'cursor-not-allowed opacity-40'
                          : action.variant === 'danger'
                            ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
                            : action.variant === 'primary'
                              ? 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                              : 'bg-white/8 text-[var(--text-primary)] hover:bg-white/12'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                  {(!intent.actions || intent.actions.length === 0) && (
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {TERMINAL_AGENT_COPY.intentEmptyActions}
                    </div>
                  )}
                </div>
              </div>

              {/* Export action */}
              {primaryValue != null && !isStreaming && (
                <button
                  onClick={() => {
                    const text = typeof primaryValue === 'string' ? primaryValue : JSON.stringify(primaryValue, null, 2);
                    const blob = new Blob([text], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `intent-result-${Date.now()}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-white/5 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                >
                  <FileDown size={14} />
                  导出结果
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </UIModal>
  );
}
