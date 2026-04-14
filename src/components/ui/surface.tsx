import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function UIPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--surface-muted)]', className)}
      {...props}
    />
  );
}

export function UISectionKicker({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-[11px] tracking-[0.24em] text-white/30', className)} {...props} />
  );
}

export function UITitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-2xl font-semibold tracking-tight text-white', className)} {...props} />
  );
}

export function UIBadge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'info' | 'success' | 'danger' }) {
  const toneClass = tone === 'info'
    ? 'bg-blue-500/12 text-blue-200 border border-blue-400/12'
    : tone === 'success'
      ? 'bg-emerald-500/12 text-emerald-200 border border-emerald-400/12'
      : tone === 'danger'
        ? 'bg-red-500/12 text-red-200 border border-red-400/10'
        : 'bg-[var(--surface-muted)] text-white/70 border border-[var(--panel-border)]';

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-3 py-1.5 text-xs', toneClass, className)}
      {...props}
    />
  );
}
